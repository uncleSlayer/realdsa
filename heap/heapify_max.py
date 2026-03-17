max_heap = [3, 17, 10, 1, 2, 8, 9, 4, 5, 7, 6]

def shift_down(arr, current_index):

    largest_index = current_index

    while True:

        left_child_index, right_child_index = current_index * 2 + 1, current_index * 2 + 2

        if left_child_index < len(arr) and arr[left_child_index] > arr[largest_index]:
            largest_index = left_child_index

        if right_child_index < len(arr) and arr[right_child_index] > arr[largest_index]:
            largest_index = right_child_index

        if largest_index == current_index:
            break
    
        arr[largest_index], arr[current_index] = arr[current_index], arr[largest_index]

        current_index = largest_index 


def heapify(arr):
    for num in range((len(arr) // 2 - 1), -1, -1):
        shift_down(arr, num)


heapify(max_heap)

print(max_heap)