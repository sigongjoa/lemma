"""
Z3 Verification Microservice
FastAPI server — POST /verify

Deploy on Railway or Fly.io as a separate service.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

from solver import verify_equation, verify_system

app = FastAPI(title="Lemma Z3 Solver", version="1.0.0")

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")


class VerifyRequest(BaseModel):
    formula: str                          # "x**2 - 5*x + 6 == 0"
    student_answer: str                   # "x = 2 or x = 3"
    formulas: Optional[list[str]] = None  # For system of equations
    key: Optional[str] = None


class VerifyResponse(BaseModel):
    valid: bool
    reason: str
    expected_solutions: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest):
    # Key check when INTERNAL_KEY is set
    if INTERNAL_KEY and req.key != INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    if req.formulas:
        result = verify_system(req.formulas, req.student_answer)
    else:
        result = verify_equation(req.formula, req.student_answer)

    return VerifyResponse(**result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
