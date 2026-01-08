from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_core.tools import tool

class MCPManager:
    def __init__(self):
        self.sessions = []
        # Define external servers you want to connect to
        self.server_configs = [
            # Example: A local Filesystem server
            StdioServerParameters(
                command="npx", 
                args=["-y", "@modelcontextprotocol/server-filesystem", "/Users/tiwari/Desktop"]
            )
        ]

    async def get_tools(self):
        """Connects to servers and converts their capabilities into LangChain Tools"""
        lc_tools = []
        
        for server_params in self.server_configs:
            # Connect to the MCP Server via Stdio
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # 1. List available tools from the server
                    tools_list = await session.list_tools()
                    
                    # 2. Convert MCP Tool -> LangChain Tool
                    for mcp_tool in tools_list.tools:
                        
                        @tool(parse_docstring=True)
                        async def dynamic_tool(**kwargs):
                            """Dynamic wrapper for MCP tool"""
                            return await session.call_tool(mcp_tool.name, arguments=kwargs)
                        
                        # Rename tool to match MCP definition
                        dynamic_tool.name = mcp_tool.name
                        dynamic_tool.description = mcp_tool.description
                        lc_tools.append(dynamic_tool)
                        
        return lc_tools