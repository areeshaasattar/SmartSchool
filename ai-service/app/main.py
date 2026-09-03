from fastapi import FastAPI
from dotenv import load_dotenv

from app.api.ai import router as ai_router

load_dotenv()

app = FastAPI(title="SmartSchool AI Service")
app.include_router(ai_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
