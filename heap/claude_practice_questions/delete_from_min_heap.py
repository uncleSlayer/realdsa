# Implement delete_min(arr)

arr = [1, 3, 2, 7, 5, 4]

"""
                1 (we are going to delete this one)
            3       2
          7   5    4      
"""

def delete_min(arr: list[int]):

    arr[0] = arr.pop()

    current_index = 0

    while True:

        smallest_value_index = current_index

        left_index, right_index = 2 * current_index + 1, 2 * current_index + 2

        if left_index < len(arr) and arr[left_index] < arr[smallest_value_index]:
            smallest_value_index = left_index

        if right_index < len(arr) and arr[right_index] < arr[smallest_value_index]:
            smallest_value_index = right_index

        if current_index == smallest_value_index:
            break

        arr[current_index], arr[smallest_value_index] = arr[smallest_value_index], arr[current_index]

        current_index = smallest_value_index

    return arr

def main():

    print(delete_min(arr))


main()