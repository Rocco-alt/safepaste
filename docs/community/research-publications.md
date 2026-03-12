# Research Publications

Potential publications and presentations based on SafePaste's intellectual property. These are aspirational — intended to track what could become shareable research as the project matures.

## Potential Publications

### Prompt Injection Attack Taxonomy
A classification system for prompt injection attacks across 9 detected categories and multiple undetected categories. Based on real-world patterns observed in AI chat interfaces.
- **Source:** `docs/security/attack-taxonomy.md`
- **Readiness:** Draft exists. Needs peer review and real-world validation data.
- **Target venue:** Technical blog post, AI security workshop paper

### Lightweight Prompt Injection Detection via Regex
Describes the weighted scoring approach with benign context dampening as an alternative to ML-based detection. Includes performance characteristics (<10ms) and false positive mitigation strategies.
- **Source:** `docs/security/detection-strategies.md`
- **Readiness:** Methodology documented. Needs quantitative evaluation results.
- **Target venue:** Technical blog post

### SafePaste Prompt Injection Benchmark
A labeled dataset of prompt injection examples for evaluating detection tools. Organized by attack category with expected outcomes.
- **Source:** `datasets/prompt-injection/`
- **Readiness:** Format defined, seed examples exist. Needs 100+ examples for publication.
- **Target venue:** Dataset publication (Hugging Face), accompanying blog post

### Evaluation Framework for Prompt Injection Detection
A methodology for measuring detection quality: metrics, test categories, regression testing process, weight calibration approach.
- **Source:** `docs/security/evaluation-methodology.md`
- **Readiness:** Methodology documented. Needs to be validated against multiple tools.
- **Target venue:** Technical blog post, comparison study
