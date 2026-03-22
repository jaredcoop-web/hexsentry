import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.extract import extract_all
from pipeline.transform import transform_all
from pipeline.load import load_all

def run_pipeline():
    print("=" * 40)
    print("  PIPELINE STARTING")
    print("=" * 40)
    raw = extract_all()
    clean = transform_all(raw)
    load_all(clean)
    print("=" * 40)
    print("  PIPELINE COMPLETE")
    print("=" * 40)

if __name__ == "__main__":
    run_pipeline()
