


def count_characters(letter, word):
    lower_word = word.lower()
    count = 0
    for ch in lower_word:
        if ch == letter:
            count += 1
        
    return count

print(count_characters("n","aaNNshin"))

def reverse_word(word):
    backward = word[::-1]
    return backward
print(reverse_word("alphabetical"))

def C_converter(number):
    new_number = int((5/9)*number-32)
    return new_number
print(C_converter(98))

