"""Magazin static. /en/, /pl/ și celelalte țări servesc aceeași pagină."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

MARKETS = {"en", "bg", "hu", "ro", "de", "at", "pl", "cz", "sk", "el"}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        parts = [part for part in unquote(parsed.path).split("/") if part]
        if len(parts) == 1 and parts[0] in MARKETS:
            query = f"?{parsed.query}" if parsed.query else ""
            self.path = "/index.html" + query
        super().do_GET()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 5173), Handler).serve_forever()
