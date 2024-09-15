#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json
import hashlib

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

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
        elif 'line' in query_params:
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

            encoder = hashlib.sha1()
            encoder.update(query_params['line'][0].encode())
            hash = encoder.digest().hex()

            print(query_params["projects"])

            response = {
                "hash": hash,
                "results": []
            }

            for n in range(amount):
                response["results"].append([
                    {
                        "value": "PRODCO",
                        "kind": 0,
                    },
                    {
                        "value": "EP00",
                        "kind": 1,
                    },
                    {
                        "value": f"00:00:00:00",
                        "kind": 2,
                    },
                    {
                        "value": f"00:00:00:00",
                        "kind": 3,
                    },
                    {
                        "value": f"Speaker {n}",
                        "kind": 4,
                    },
                    {
                        "value": f"{hash}",
                        "kind": 5,
                    },
                ])

            self.wfile.write(bytes(json.dumps(response), "utf-8"))
        elif 'projects' in query_params:
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

            encoder = hashlib.sha1()
            encoder.update(query_params['projects'][0].encode())
            hash = encoder.digest().hex()

            response = {
                "hash": hash,
                "results": []
            }

            for n in range(amount):
                response["results"].append(f"project {n}")

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
