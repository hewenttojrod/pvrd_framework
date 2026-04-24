from datetime import datetime
import inspect

def log(message, args={}, verbose=False):   
    args["timestamp"] =  datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if verbose:
        frame = inspect.currentframe().f_back
        args["file"] = frame.f_code.co_filename
        args["line"] = frame.f_lineno
    print(f"{message}: {args}")
