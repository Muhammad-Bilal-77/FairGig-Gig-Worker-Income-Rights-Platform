#!/usr/bin/env python3
"""
Runnable test suite for anomaly detection checks.

This script runs all individual anomaly detection tests and provides a summary.
"""

import subprocess
import sys
from pathlib import Path

def run_test(test_file: str, description: str) -> bool:
    """Run a single test file and return whether it passed."""
    print(f"\n{'='*70}")
    print(f"  {description}")
    print(f"{'='*70}\n")
    
    result = subprocess.run(
        [sys.executable, str(test_file)],
        cwd=Path(test_file).parent,
        capture_output=False
    )
    
    return result.returncode == 0

def main():
    base_path = Path(__file__).parent
    
    tests = [
        (base_path / "test_deduction_spike.py", "Test 1/5: Deduction Rate Spike"),
        (base_path / "test_monthly_drop.py", "Test 2/5: Monthly Income Drop"),
        (base_path / "test_hourly_anomaly.py", "Test 3/5: Hourly Rate Anomaly"),
        (base_path / "test_long_gap.py", "Test 4/5: Long Shift Gap"),
        (base_path / "test_comprehensive.py", "Test 5/5: Comprehensive Integration Test"),
    ]
    
    print(f"╔{'═'*68}╗")
    print(f"║{' '*12}ANOMALY DETECTION TEST SUITE{' '*28}║")
    print(f"╚{'═'*68}╝")
    
    results = []
    for test_file, description in tests:
        if not test_file.exists():
            print(f"\n✗ Test file not found: {test_file}")
            results.append((description, False))
        else:
            passed = run_test(test_file, description)
            results.append((description, passed))
    
    # Print summary
    print(f"\n\n{'='*70}")
    print(f"  TEST SUMMARY")
    print(f"{'='*70}\n")
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for description, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {description}")
    
    print(f"\n  Total: {passed_count}/{total_count} tests passed")
    print(f"{'='*70}\n")
    
    return 0 if passed_count == total_count else 1

if __name__ == "__main__":
    sys.exit(main())
