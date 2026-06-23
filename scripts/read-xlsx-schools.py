#!/usr/bin/env python3
"""Read school rows from _สพป.ชัยนาท.xlsx and print JSON to stdout."""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_rows(path: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings: list[str] = []
        shared_xml = zf.read("xl/sharedStrings.xml")
        for si in ET.fromstring(shared_xml).findall("m:si", NS):
            texts = [t.text or "" for t in si.findall(".//m:t", NS)]
            shared_strings.append("".join(texts))

        sheet_xml = zf.read("xl/worksheets/sheet1.xml")
        rows: list[list[str]] = []
        for row in ET.fromstring(sheet_xml).findall("m:sheetData/m:row", NS):
            vals: list[str] = []
            for cell in row.findall("m:c", NS):
                cell_type = cell.get("t")
                value_el = cell.find("m:v", NS)
                if value_el is None or value_el.text is None:
                    vals.append("")
                elif cell_type == "s":
                    vals.append(shared_strings[int(value_el.text)])
                else:
                    vals.append(value_el.text)
            if any(vals):
                rows.append(vals)
        return rows


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "_สพป.ชัยนาท.xlsx"
    rows = read_rows(path)
    if not rows:
        print("[]")
        return

    header = rows[0]
    try:
        smis_idx = header.index("SMIS")
        moe_idx = header.index("รหัสกระทรวง")
        name_idx = header.index("โรงเรียน")
    except ValueError as exc:
        raise SystemExit(f"Unexpected header columns: {header[:6]}") from exc

    schools = []
    for row in rows[1:]:
        smis = (row[smis_idx] if len(row) > smis_idx else "").strip()
        moe = (row[moe_idx] if len(row) > moe_idx else "").strip()
        name = (row[name_idx] if len(row) > name_idx else "").strip()
        if not smis or not name:
            continue
        schools.append({"smis": smis, "moe": moe, "name": name})

    json.dump(schools, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
