import os
import sys

# Anchors ml-service/ on sys.path so `import main` resolves regardless of
# how pytest is invoked (mirrors the presence of this file, not its content).
sys.path.insert(0, os.path.dirname(__file__))
