import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        line_num = i + 1
        # Very simple tag extractor
        pos = 0
        while True:
            start_idx = line.find('<div', pos)
            close_idx = line.find('</div>', pos)
            
            if start_idx == -1 and close_idx == -1:
                break
                
            if start_idx != -1 and (close_idx == -1 or start_idx < close_idx):
                # Found opening tag
                # Check if it's self-closing (unlikely for div but good to check)
                tag_end = line.find('>', start_idx)
                if tag_end != -1 and line[tag_end-1] == '/':
                    pass # Self-closing
                else:
                    stack.append(('div', line_num))
                pos = start_idx + 4
            else:
                # Found closing tag
                if not stack:
                    print(f"Extra closing tag at line {line_num}")
                else:
                    stack.pop()
                pos = close_idx + 6
                
    for tag, line in stack:
        print(f"Unclosed {tag} from line {line}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
