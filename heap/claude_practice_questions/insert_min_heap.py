# Implement insert(arr, value) for a min heap. Same structure as Q1 - only one thing changes

arr = [1, 3, 2, 7, 5, 4]

0

"""
            1
        3       2
    7       5       4]

x (0, the value to be inserted)

"""

def insert(arr: list[int], value: int):

    arr.append(value)

    current_index = len(arr) - 1

    while current_index > 0:

        parent_index = (current_index - 1) // 2

        if arr[current_index] < arr[parent_index]:
            arr[current_index], arr[parent_index] = arr[parent_index], arr[current_index]

            current_index = parent_index

    return arr


def main():

    print(insert(arr, 0))


main()