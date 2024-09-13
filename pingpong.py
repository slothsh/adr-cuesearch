#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        # Check if 'q=ping' is in the query string
        if 'q' in query_params and query_params['q'][0] == 'ping':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Origin', '*')  # Adjust for your specific origin policy
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')  # Adjust for your specific origin policy
            self.send_header('Access-Control-Allow-Credentials', 'true')  # Adjust for your specific origin policy
            self.end_headers()
            response = { "message": "pong!" }
            self.wfile.write(bytes(json.dumps(response), "utf-8"))
        elif 'q' in query_params and query_params['q'][0] == "search":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Origin', '*')  # Adjust for your specific origin policy
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')  # Adjust for your specific origin policy
            self.send_header('Access-Control-Allow-Credentials', 'true')  # Adjust for your specific origin policy
            self.end_headers()
            
            amount = 5
            if 'amount' in query_params and query_params['amount'][0].isnumeric():
                amount = int(query_params['amount'][0])

            response = {
                "data": []
            }

            for n in range(amount):
                response["data"].append({
                    "column1": f"{n}",
                    "column2": f"{n}",
                    "column3": f"{n}",
                    "column4": f"{n}",
                })

            self.wfile.write(bytes(json.dumps(response), "utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        # Respond with allowed methods and headers
        self.send_response(200)
        self.send_header('Allow', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Origin', '*')  # Adjust for your specific origin policy
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')  # Adjust for your specific origin policy
        self.send_header('Access-Control-Allow-Credentials', 'true')  # Adjust for your specific origin policy
        # self.send_header('Sec-Fetch-Mode', 'no-cors')  # Adjust for your specific origin policy
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 6969), SimpleHandler)
    print("Server running on http://localhost:6969")
    server.serve_forever()
