# Implement insert(arr, value) for a max heap using shift_up. Do not use any built-in heap library

arr = [10, 7, 9, 3, 5, 4]

"""
                10
            7       9
        3       5       4
    x(the new value)
"""

def insert(arr: list[int], value: int):

    arr.append(value)

    current_index = len(arr) - 1

    while current_index > 0:
        print('current index is: ', current_index)
        parent_element_index = (current_index - 1) // 2

        if arr[current_index] > arr[parent_element_index]:
            
            arr[current_index], arr[parent_element_index] = arr[parent_element_index], arr[current_index]

            current_index = parent_element_index 

    return arr

def main():
    print(insert(arr=arr, value=770))

main()