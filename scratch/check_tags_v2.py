import sys
import re

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'{\/\*.*?\*\/}', '', content, flags=re.DOTALL)
    
    tags = re.findall(r'<(/?(?:div|table|thead|tbody|tr|th|td|Button|PageTransition|AppLayout|Fragment))(?:\s|>|/)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            tag_name = tag[1:]
            if not stack:
                print(f"Extra closing tag: </{tag_name}>")
            elif stack[-1] != tag_name:
                print(f"Mismatched tag: expected </{stack[-1]}>, found </{tag_name}>")
                stack.pop()
            else:
                stack.pop()
        else:
            # Handle self-closing tags (simplified)
            # This is hard with regex, but let's assume standard React components might be self-closing
            stack.append(tag)
            
    if stack:
        print(f"Unclosed tags: {stack}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
