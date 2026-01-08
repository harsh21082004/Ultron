import asyncio
from typing import List
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_core.tools import tool, StructuredTool

class MCPManager:
    def __init__(self):
        # Configuration for external MCP Servers
        # Example: Connect to a local filesystem server
        self.server_configs = [
            # Uncomment and adjust path to use actual MCP servers
            # StdioServerParameters(
            #     command="npx",
            #     args=["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Desktop"]
            # )
        ]

    async def get_tools(self) -> List[StructuredTool]:
        """
        Connects to configured MCP servers, discovers tools, 
        and converts them into LangChain-compatible tools.
        """
        lc_tools = []
        
        for server_params in self.server_configs:
            try:
                # We use a context manager to connect, list tools, and create wrappers
                # Note: In a real app, you might want persistent sessions.
                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # 1. Discover Tools
                        tools_list = await session.list_tools()
                        
                        # 2. Wrap Tools for LangChain
                        for mcp_tool in tools_list.tools:
                            
                            async def _dynamic_tool_func(**kwargs):
                                # Re-connect for execution (stateless wrapper)
                                async with stdio_client(server_params) as (r, w):
                                    async with ClientSession(r, w) as s:
                                        await s.initialize()
                                        return await s.call_tool(mcp_tool.name, arguments=kwargs)

                            # Create StructuredTool
                            lc_tool = StructuredTool.from_function(
                                func=None,
                                coroutine=_dynamic_tool_func,
                                name=mcp_tool.name,
                                description=mcp_tool.description
                            )
                            lc_tools.append(lc_tool)
            except Exception as e:
                print(f"Error connecting to MCP Server: {e}")
                
        return lc_tools