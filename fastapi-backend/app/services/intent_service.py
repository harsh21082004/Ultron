from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from ..core.llm_factory import get_llm_factory

class IntentOutput(BaseModel):
    intent: str = Field(description="One of: search, reasoning, general, change_preference")
    dynamic_status: str = Field(description="Action description")
    pref_key: str | None = Field(description="If change_preference, the key (language/theme/name).", default=None)
    pref_value: str | None = Field(description="If change_preference, the NEW value.", default=None)
    input_language: str = Field(description="The language the user is writing in.")

class IntentService:
    def __init__(self):
        factory = get_llm_factory()
        self.llm = factory.get_tooling_model()
        self.parser = JsonOutputParser(pydantic_object=IntentOutput)

        self.router_prompt = ChatPromptTemplate.from_messages([
            ("system", """
            You are the 'Brain' of Ultron. 
            1. Classify the user's intent.
            2. Detect the language the user is writing in.
            
            Categories:
            - search: Current events, news, weather.
            - reasoning: Logic, math, coding.
            - change_preference: ONLY if the user explicitly COMMANDS a change (e.g., "Change language to Hindi", "Set theme to Dark").
                * DO NOT use this for questions like "What is my language?" or "Check my settings".
            - general: Chat, greetings, and QUESTIONS about current settings/preferences.

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
            
            intent = result.get("intent", "general").strip().lower()
            
            # --- CORRECTION LOGIC ---
            # If intent is 'change_preference' but NO value was provided, 
            # it means the user likely asked a question (e.g., "What is my language?").
            # Revert to 'general' to avoid accidental null updates.
            pref_value = result.get("pref_value")
            
            if "preference" in intent:
                if not pref_value or pref_value.lower() == "none" or pref_value.lower() == "null":
                    intent = "general"
                else:
                    intent = "change_preference"
            elif "search" in intent: intent = "search"
            elif "reasoning" in intent: intent = "reasoning"
            else: intent = "general"
            
            return {
                "intent": intent,
                "status": result.get("dynamic_status", "Processing..."),
                "pref_data": {
                    "key": result.get("pref_key"), 
                    "value": pref_value
                } if intent == "change_preference" else None,
                "input_language": result.get("input_language", "English")
            }
        except Exception as e:
            print(f"Intent Error: {e}")
            return {"intent": "general", "status": "Thinking...", "pref_data": None, "input_language": "English"}