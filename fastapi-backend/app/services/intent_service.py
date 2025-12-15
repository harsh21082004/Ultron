from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field
from ..core.llm_factory import get_llm_factory

# Define the desired output structure
class IntentOutput(BaseModel):
    intent: str = Field(description="One of: search, reasoning, general")
    dynamic_status: str = Field(description="A short, present-tense description of what the AI is about to do. E.g., 'Searching for latest AI news...', 'Calculating the trajectory...', 'Drafting a poem...'")

class IntentService:
    """
    Returns: 'search', 'reasoning', or 'general' along with a dynamic status.
    """
    def __init__(self):
        factory = get_llm_factory()
        self.llm = factory.get_tooling_model()
        self.parser = JsonOutputParser(pydantic_object=IntentOutput)

        self.router_prompt = ChatPromptTemplate.from_messages([
            ("system", """
            You are the 'Brain' of an advanced AI assistant named Ultron.
            
            Your task:
            1. Analyze the user's input.
            2. Classify it into EXACTLY one category: 'search', 'reasoning', or 'general'.
            3. Write a 'dynamic_status' message that briefly describes the action you are taking.
            
            Categories:
            - search: For current events, news, weather, facts, sports. Status ex: "Scanning web for real-time weather..."
            - reasoning: For logic, math, coding, planning. Status ex: "Analyzing logic steps...", "Designing code architecture..."
            - general: For greetings, chat, creative writing. Status ex: "Thinking of a creative response...", " formulating reply..."

            {format_instructions}
            """),
            ("human", "{input}")
        ])

        self.chain = self.router_prompt | self.llm | self.parser

    async def classify_intent(self, user_input: str) -> dict:
        try:
            result = await self.chain.ainvoke({
                "input": user_input,
                "format_instructions": self.parser.get_format_instructions()
            })
            
            # Normalize intent
            intent = result.get("intent", "general").strip().lower()
            if "search" in intent: intent = "search"
            elif "reasoning" in intent: intent = "reasoning"
            else: intent = "general"
            
            return {
                "intent": intent,
                "status": result.get("dynamic_status", "Processing...")
            }
        except Exception as e:
            print(f"Intent Classification Failed: {e}")
            return {"intent": "general", "status": "Thinking..."}