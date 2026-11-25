#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/build.py — сборка единого офлайн-HTML из модулей проекта.
Результат: dist/transresearch-wave2-offline.html
Запуск:  python3 tools/build.py
"""
import re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
OUT  = os.path.join(DIST, "transresearch-wave2-offline.html")

def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()

def main():
    html   = read("index.html")
    css    = read("styles.css")
    config = read("config.js")
    app    = read("app.js")
    xlsx   = read(os.path.join("lib", "xlsx.full.min.js"))

    # CSS в <style>
    html = html.replace('<link rel="stylesheet" href="styles.css">',
                        "<style>\n" + css + "\n</style>")

    # Скрипты инлайним в порядке подключения
    html = html.replace('<script src="lib/xlsx.full.min.js"></script>',
                        "<script>\n" + xlsx + "\n</script>")
    html = html.replace('<script src="config.js"></script>',
                        "<script>\n" + config + "\n</script>")
    html = html.replace('<script src="app.js"></script>',
                        "<script>\n" + app + "\n</script>")

    if 'src="styles.css"' in html or 'src="lib/' in html or 'src="config.js"' in html or 'src="app.js"' in html:
        print("WARNING: не все внешние ресурсы инлайнены", file=sys.stderr)

    os.makedirs(DIST, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK: {OUT} ({os.path.getsize(OUT)} байт)")

if __name__ == "__main__":
    main()
