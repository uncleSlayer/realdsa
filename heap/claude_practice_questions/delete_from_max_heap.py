# Implement delete_max(arr). Must return the extracted max value and leave arr as valid max heap.

arr = [10, 7, 9, 3, 5, 4]

"""
                    10 (delete this value)
            7               9
        3       5       4
"""


def delete_max(arr: list[int]):

    arr[0] = arr.pop()

    current_index = 0

    while True:

        largest_value_index = current_index

        left_child_index, right_child_index = current_index * 2 + 1, current_index * 2 + 2

        if left_child_index < len(arr) and arr[left_child_index] > arr[largest_value_index]:
            largest_value_index = left_child_index

        if right_child_index < len(arr) and arr[right_child_index] > arr[largest_value_index]:
            largest_value_index = right_child_index

        if current_index == largest_value_index:
            break

        arr[current_index], arr[largest_value_index] = arr[largest_value_index], arr[current_index]

        current_index = largest_value_index

    return arr 

def main():

    print(delete_max(arr))


main()