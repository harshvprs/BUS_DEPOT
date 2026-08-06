## 2024-05-18 - O(N²) Performance bottlenecks in nested React iterations
**Learning:** Found multiple instances where nested `.filter()` and `.find()` array methods were used inside `.map()` loops when aggregating data (e.g., Reports and Dashboard). This creates O(M×N) complexity, causing main-thread blockage when rendering large datasets.
**Action:** Always extract inner array scans into pre-computed hash maps (O(N) lookup) before executing outer loops to achieve O(M+N) complexity.
