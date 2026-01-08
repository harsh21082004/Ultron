import json
import logging
# Import yt_dlp for rich metadata
import yt_dlp
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
    
    # [NEW] Tool for Metadata
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
            if not results: return json.dumps({"error": "No videos found."})
            
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

    # [NEW] Fetch Metadata using yt-dlp
    def get_video_details(self, video_id: str) -> str:
        try:
            print(f"\n[YouTube Service] ℹ️ Fetching metadata for ID: {video_id}", flush=True)
            
            if "v=" in video_id: video_id = video_id.split("v=")[1].split("&")[0]
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True, # We only want data, not the video file
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Format Publish Date (YYYYMMDD -> Readable)
                raw_date = info.get('upload_date', '')
                formatted_date = raw_date
                if len(raw_date) == 8:
                    from datetime import datetime
                    formatted_date = datetime.strptime(raw_date, "%Y%m%d").strftime("%B %d, %Y")

                metadata = {
                    "title": info.get('title'),
                    "channel": info.get('uploader'),
                    "views": f"{info.get('view_count', 0):,}", # Add commas
                    "likes": f"{info.get('like_count', 0):,}", 
                    "publish_date": formatted_date,
                    "description": info.get('description', '')[:1000] + "...", # Truncate long descriptions
                    "tags": info.get('tags', [])[:5],
                    "is_music": "music" in info.get('categories', []) or "Music" in info.get('categories', [])
                }
                
                return json.dumps(metadata)

        except Exception as e:
            print(f"[YouTube Service] ❌ Metadata Error: {e}", flush=True)
            return json.dumps({"error": "Could not fetch metadata"})

    # [EXISTING] Your working transcript code (Unchanged)
    def get_video_transcript(self, video_id: str) -> str:
        try:
            print(f"\n[YouTube Service] 📜 Fetching transcript for ID: {video_id}", flush=True)
            if "v=" in video_id: video_id = video_id.split("v=")[1].split("&")[0]
            if "youtu.be" in video_id: video_id = video_id.split("/")[-1].split("?")[0]

            transcript_list = []
            try:
                # Assuming this specific method works for you as stated
                transcript_list_obj = YouTubeTranscriptApi().fetch(video_id)
                for snippet in transcript_list_obj:
                    transcript_list.append(snippet.text)
            except Exception:
                # Fallback logic
                transcript_list_obj = YouTubeTranscriptApi().fetch(video_id)
                for snippet in transcript_list_obj:
                    transcript_list.append(snippet.text)

            full_text = " ".join(transcript_list)
            preview = full_text[:200].replace('\n', ' ')
            print(f"[YouTube Service] ✅ Success: {preview}...", flush=True)
            return full_text[:5000] + "... (truncated)"
            
        except TranscriptsDisabled:
            return "ERROR: NO_TRANSCRIPT_AVAILABLE. (Captions disabled)"
        except NoTranscriptFound:
            return "ERROR: NO_TRANSCRIPT_AVAILABLE. (No language found)"
        except Exception as e:
            return f"ERROR: Could not fetch transcript. Reason: {str(e)}"