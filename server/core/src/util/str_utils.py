import hashlib
import re

def strs_to_numeric_code(*args:str, length: int = None) -> str:
    '''
        Takes in any number of 
    '''
    # 1) Normalize for stable results
    def normalize(s: str) -> str:
        s = s.strip().lower()
        s = re.sub(r"\s+", " ", s)
        return s

    source = ""
    for val in args:
        source += normalize(val)

    # 2) Deterministic hash -> integer
    digest_hex = hashlib.sha256(source.encode("utf-8")).hexdigest()
    num = int(digest_hex, 16)

    # 3) Force max length, then left-pad with 0s
    if length:
        formatted_num = str(num % (10 ** length)).zfill(length)
    else:
        formatted_num = str(num)
    return formatted_num