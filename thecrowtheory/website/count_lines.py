import pdfplumber

with pdfplumber.open("/Users/abhinilagarwal/Desktop/memetic-brand-labs/thecrowtheory/Designer Assets/TCT_Landing Page_Desk.pdf") as pdf:
    page = pdf.pages[0]
    print("=== Line coordinates count by section ===")
    sections = {
        "Hero (0-842)": 0,
        "Philosophy (842-1684)": 0,
        "Capabilities & BuildBeyond (1684-3322)": 0,
        "WhoAreCrows (3322-3860)": 0,
        "Footer (3860-4415)": 0
    }
    for l in page.lines:
        y = l["top"]
        if 0 <= y < 842.2:
            sections["Hero (0-842)"] += 1
        elif 842.2 <= y < 1684.4:
            sections["Philosophy (842-1684)"] += 1
        elif 1684.4 <= y < 3322.1:
            sections["Capabilities & BuildBeyond (1684-3322)"] += 1
        elif 3322.1 <= y < 3860.0:
            sections["WhoAreCrows (3322-3860)"] += 1
        else:
            sections["Footer (3860-4415)"] += 1
            
    for sec, count in sections.items():
        print(f"{sec}: {count} lines")
