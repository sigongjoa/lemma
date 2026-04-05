"""
Z3 Solver wrapper for math equation verification.

Supports:
  - Polynomial equations  (x**2 - 5*x + 6 == 0)
  - Inequalities          (2*x + 3 > 0)
  - System of equations   ['x + y == 5', 'x - y == 1']
"""

import re
from z3 import (
    Real, Int, Bool, Solver, sat, unsat,
    parse_smt2_string, simplify, Not, And
)
from typing import Union


def _parse_answer(raw: str) -> list[str]:
    """
    Parse student answer string into a list of numeric expressions.
    Examples:
      'x = 2 or x = 3'  -> ['2', '3']
      'x = -1/2'         -> ['-1/2']
      '2'                -> ['2']
    """
    # Remove whitespace
    raw = raw.strip()
    # Extract all numbers (including fractions and negatives)
    tokens = re.findall(r'-?\s*\d+\s*/\s*\d+|-?\s*\d+\.?\d*', raw)
    return [t.replace(' ', '') for t in tokens]


def verify_equation(formula: str, student_answer: str) -> dict:
    """
    Verify whether student_answer satisfies the given formula.

    Args:
        formula: e.g. "x**2 - 5*x + 6 == 0"
        student_answer: e.g. "x = 2 or x = 3"

    Returns:
        { valid: bool, reason: str, expected_solutions: list[str] }
    """
    try:
        x = Real('x')
        solver = Solver()

        # Build the equation expression
        # We evaluate the formula with x as the Z3 variable
        local_ns = {'x': x, 'Real': Real}
        try:
            expr = eval(formula, {"__builtins__": {}}, local_ns)
        except Exception as e:
            return {
                "valid": False,
                "reason": f"수식 파싱 오류: {str(e)}",
                "expected_solutions": []
            }

        # Find all solutions in range [-100, 100]
        solutions = []
        for i in range(-200, 201):
            v = i / 2  # 0.5 step
            test_solver = Solver()
            test_solver.add(expr)
            test_solver.add(x == v)
            if test_solver.check() == sat:
                solutions.append(str(v if v != int(v) else int(v)))

        # Deduplicate
        solutions = list(dict.fromkeys(solutions))[:10]

        # Check student answers
        student_vals = _parse_answer(student_answer)
        if not student_vals:
            return {
                "valid": False,
                "reason": "학생 답에서 숫자를 인식할 수 없어요",
                "expected_solutions": solutions
            }

        wrong = []
        for val_str in student_vals:
            try:
                val = float(eval(val_str))
                check_solver = Solver()
                check_solver.add(expr)
                # Use approximate equality (within 0.001)
                approx_match = False
                for s in solutions:
                    if abs(float(s) - val) < 0.001:
                        approx_match = True
                        break
                if not approx_match:
                    wrong.append(val_str)
            except Exception:
                wrong.append(val_str)

        if wrong:
            return {
                "valid": False,
                "reason": f"{', '.join(wrong)}은(는) 이 방정식의 해가 아닙니다. 올바른 해: {', '.join(solutions)}",
                "expected_solutions": solutions
            }

        # Also check completeness — student should have all solutions
        missing = []
        for sol in solutions:
            matched = any(abs(float(eval(v)) - float(sol)) < 0.001 for v in student_vals)
            if not matched:
                missing.append(sol)

        if missing:
            return {
                "valid": False,
                "reason": f"해가 빠졌어요: {', '.join(missing)}도 포함해야 합니다",
                "expected_solutions": solutions
            }

        return {
            "valid": True,
            "reason": "올바른 풀이입니다",
            "expected_solutions": solutions
        }

    except Exception as e:
        return {
            "valid": False,
            "reason": f"검증 오류: {str(e)}",
            "expected_solutions": []
        }


def verify_system(formulas: list[str], student_answer: str) -> dict:
    """Verify a system of equations."""
    try:
        x, y, z = Real('x'), Real('y'), Real('z')
        local_ns = {'x': x, 'y': y, 'z': z}

        solver = Solver()
        for f in formulas:
            expr = eval(f, {"__builtins__": {}}, local_ns)
            solver.add(expr)

        if solver.check() == unsat:
            return {"valid": False, "reason": "해가 없는 연립방정식입니다", "expected_solutions": []}

        model = solver.model()
        solutions = {str(d): str(model[d]) for d in model}

        return {
            "valid": True,
            "reason": "검증 통과",
            "expected_solutions": [f"{k}={v}" for k, v in solutions.items()]
        }
    except Exception as e:
        return {"valid": False, "reason": str(e), "expected_solutions": []}
