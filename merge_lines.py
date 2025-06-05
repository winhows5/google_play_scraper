import os

def preprocess_csv(input_filepath, output_filepath, delimiter='\x1F', expected_fields=13):
    with open(input_filepath, 'r', encoding='utf-8') as infile, \
         open(output_filepath, 'w', encoding='utf-8') as outfile:
        
        complete_row = ''
        flush_interval=10000
        count = 0
        for line in infile:
            count += 1
            print("line count: ", count)
            line = line.strip('\n')
            complete_row += line
            if complete_row.count(delimiter) + 1 == expected_fields:
                processed_row = complete_row.replace('\n', '\\n')
                outfile.write(processed_row + '\n')
                complete_row = ''
            elif complete_row.count(delimiter) + 1 > expected_fields:
                print("error line count: ", count)
                break
            else:
                complete_row = "".join([complete_row, '\n'])
            if count % flush_interval == 0:
                outfile.flush()

def process_directory(dir_a, dir_b):
    for filename in os.listdir(dir_a):
        if filename.endswith('.csv') and filename != ".retry.csv":
            input_filepath = os.path.join(dir_a, filename)
            output_filepath = os.path.join(dir_b, filename)
            preprocess_csv(input_filepath, output_filepath)

dir_a = 'US_review_20250604'
dir_b = 'US_review_20250605'
process_directory(dir_a, dir_b)