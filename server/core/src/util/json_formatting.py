import json
from .log_handler import log

def format_json(json_data, sort_keys=True):
    """Format JSON data into a pretty-printed string."""
    return json.dumps(json_data, indent=4, sort_keys=sort_keys)

def parse_json(json_string):
    """Parse a JSON string into a Python dictionary."""
    try:
        return json.loads(json_string)
    except json.JSONDecodeError as e:
        log(f"Invalid JSON data: {e}", verbose=True)
