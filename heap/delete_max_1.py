max_heap = [50, 38, 40, 10, 20, 35, 45]

def delete_from_heap(heap):

    heap[0] =  heap[-1]
    heap.pop()

    current_index = 0

    while True:

        left_child_index, right_child_index = 2 * current_index + 1, 2 * current_index + 2

        largest = current_index

        if left_child_index < len(heap) and heap[left_child_index] > heap[largest]:
            largest = left_child_index
        if right_child_index < len(heap) and heap[right_child_index] > heap[largest]:
            largest = right_child_index

        if largest == current_index:
            break

        heap[current_index], heap[largest] = heap[largest], heap[current_index]

        current_index = largest

    return heap

print(delete_from_heap(max_heap))

