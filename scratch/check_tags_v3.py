import sys
import re

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'{\/\*.*?\*\/}', '', content, flags=re.DOTALL)
    
    # Find all tags
    tags = re.findall(r'<(/?(?:div|table|thead|tbody|tr|th|td|Button|PageTransition|AppLayout|Fragment|Progress|Skeleton|Link))(?:\s|>|/)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            tag_name = tag[1:]
            if not stack:
                print(f"Extra closing tag: </{tag_name}>")
            elif stack[-1] != tag_name:
                # Find where it was opened
                print(f"Mismatched tag: expected </{stack[-1]}>, found </{tag_name}>")
                stack.pop()
            else:
                stack.pop()
        else:
            # Check for self-closing in the original content
            # This is hard because re.findall doesn't give us the context easily.
            # Let's just assume if it's Link, Button, Progress, Skeleton, it MIGHT be self-closing.
            # But in this file they are usually not, except maybe Progress.
            stack.append(tag)
            
    print(f"Remaining stack: {stack}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
