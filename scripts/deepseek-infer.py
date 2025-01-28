from openai import OpenAI
import os

api_key = os.getenv("APIKEY")

client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

OPENING_CODE_TAG = "<CODE_6077>"
CLOSING_CODE_TAG = "</CODE_6077>"

def get_messages(file_name, infill_prefix, infill_suffix):
    return [
        {
            'role': 'system',
            'content': f'You are a code completion AI designed to take the surrounding code and shared context into account in order to predict and suggest high-quality code to complete the code enclosed in {OPENING_CODE_TAG} tags. You only respond with code that works and fits seamlessly with surrounding code if any or use best practice and nothing else.'
        },
        {
            'role': 'assistant', 
            'content': 'I am a code completion AI with exceptional context-awareness designed to auto-complete nested code blocks with high-quality code that seamlessly integrates with surrounding code.'
        },
        {
            'role': 'user',
            'content': f'Below is the code from file path {file_name}. Review the code outside the XML tags to detect the functionality, formats, style, patterns, and logics in use. Then, use what you detect and reuse methods/libraries to complete and enclose completed code only inside XML tags precisely without duplicating existing implementations. Here is the code: \n```\n{infill_prefix}{OPENING_CODE_TAG}{CLOSING_CODE_TAG}{infill_suffix}\n```'
        },
        {
            'role': 'assistant',
            'content': f'{OPENING_CODE_TAG}'
        }
    ]

infill_prefix = '''
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
'''
expected_output = '''
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
'''
infill_suffix = '''
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
'''


if __name__ == "__main__":
    file_name = "binary_search.py"
    response = client.chat.completions.create(
        model = "deepseek-chat",
        messages = get_messages(file_name, infill_prefix, infill_suffix),
        stream = False
    )

    print(response.choices[0].message.content)