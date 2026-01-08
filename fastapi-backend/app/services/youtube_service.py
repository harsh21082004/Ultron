import json
import logging
# Import yt_dlp for rich metadata
import yt_dlp
# Import the specific class from the library
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from youtube_search import YoutubeSearch
from langchain_core.tools import StructuredTool

logger = logging.getLogger("uvicorn.error")

class YoutubeService:
    def __init__(self):
        pass

    def get_search_tool(self):
        return StructuredTool.from_function(
            func=self.search_youtube,
            name="search_youtube",
            description="Search for videos on YouTube. Input: query string."
        )

    def get_transcript_tool(self):
        return StructuredTool.from_function(
            func=self.get_video_transcript,
            name="get_video_transcript",
            description="Get text transcript of a video. Input: video_id."
        )
    
    def get_details_tool(self):
        return StructuredTool.from_function(
            func=self.get_video_details,
            name="get_video_details",
            description="Get rich metadata (Title, Channel, Views, Likes, Description) of a video. Input: video_id."
        )

    def search_youtube(self, query: str, max_results: int = 5) -> str:
        try:
            print(f"\n[YouTube Service] 🔍 Searching for: {query}", flush=True)
            results = YoutubeSearch(str(query), max_results=max_results).to_dict()
            
            if not results:
                return json.dumps({"error": "No videos found."})

            clean_results = []
            for v in results:
                clean_results.append({
                    "title": v.get("title", "Unknown"),
                    "id": v.get("id", ""),
                    "link": f"https://www.youtube.com/watch?v={v.get('id')}",
                    "duration": v.get("duration", "0:00")
                })
            
            return json.dumps(clean_results)
            
        except Exception as e:
            return json.dumps({"error": f"Search failed: {str(e)}"})

    def get_video_details(self, video_id: str) -> str:
        """
        Robust metadata fetcher.
        1. Tries yt-dlp (rich data).
        2. If blocked, falls back to YoutubeSearch (basic data).
        """
        try:
            print(f"\n[YouTube Service] ℹ️ Fetching metadata for ID: {video_id}", flush=True)
            
            if "v=" in video_id: video_id = video_id.split("v=")[1].split("&")[0]
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            # ATTEMPT 1: yt-dlp (Rich Metadata)
            try:
                # Use Android client to reduce chance of "Sign in" errors
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'skip_download': True,
                    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    
                    raw_date = info.get('upload_date', '')
                    formatted_date = raw_date
                    if len(raw_date) == 8:
                        from datetime import datetime
                        formatted_date = datetime.strptime(raw_date, "%Y%m%d").strftime("%B %d, %Y")

                    metadata = {
                        "title": info.get('title'),
                        "channel": info.get('uploader'),
                        "views": f"{info.get('view_count', 0):,}",
                        "likes": f"{info.get('like_count', 0):,}", 
                        "publish_date": formatted_date,
                        "description": info.get('description', '')[:500] + "...", 
                        "source": "yt-dlp"
                    }
                    print("[YouTube Service] ✅ Metadata fetched via yt-dlp")
                    return json.dumps(metadata)

            except Exception as e:
                print(f"[YouTube Service] ⚠️ yt-dlp blocked ({str(e)}). Switching to fallback...", flush=True)

            # ATTEMPT 2: Fallback to YoutubeSearch (Basic Metadata)
            # Searching by ID usually returns the specific video result
            search_results = YoutubeSearch(video_id, max_results=1).to_dict()
            
            if search_results:
                v = search_results[0]
                metadata = {
                    "title": v.get("title"),
                    "channel": v.get("channel"),
                    "views": v.get("views"), # Usually string like "1M views"
                    "likes": "N/A", # Not available in search results
                    "publish_date": v.get("publish_time"),
                    "description": v.get("long_desc") or "Description unavailable in fallback mode.",
                    "source": "search_fallback"
                }
                print("[YouTube Service] ✅ Metadata fetched via Search Fallback")
                return json.dumps(metadata)
            
            return json.dumps({"error": "Video details could not be retrieved."})

        except Exception as e:
            print(f"[YouTube Service] ❌ Metadata Critical Error: {e}", flush=True)
            return json.dumps({"error": "Could not fetch metadata"})

    def get_video_transcript(self, video_id: str) -> str:
        try:
            print(f"\n[YouTube Service] 📜 Fetching transcript for ID: {video_id}", flush=True)
            if "v=" in video_id: video_id = video_id.split("v=")[1].split("&")[0]
            if "youtu.be" in video_id: video_id = video_id.split("/")[-1].split("?")[0]

            transcript_list = []
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception:
                print(f"[YouTube Service] Standard fetch failed. Trying fallback list...", flush=True)
                transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
                for transcript in transcript_list_obj:
                    transcript_list = transcript.fetch()
                    break

            if not transcript_list:
                raise Exception("No transcript data found.")

            full_text = " ".join([t['text'] for t in transcript_list])
            preview = full_text[:200].replace('\n', ' ')
            print(f"[YouTube Service] ✅ Success: {preview}...", flush=True)
            
            return full_text[:5000] + "... (truncated)"
            
        except TranscriptsDisabled:
            print(f"[YouTube Service] ⚠️ Transcripts Disabled.", flush=True)
            return "ERROR: NO_TRANSCRIPT_AVAILABLE. (Captions disabled)"
        except NoTranscriptFound:
            print(f"[YouTube Service] ⚠️ No Language Found.", flush=True)
            return "ERROR: NO_TRANSCRIPT_AVAILABLE. (No language found)"
        except Exception as e:
            print(f"[YouTube Service] ❌ Transcript Error: {e}", flush=True)
            return f"ERROR: Could not fetch transcript. Reason: {str(e)}"