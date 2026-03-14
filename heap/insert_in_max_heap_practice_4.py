from typing import List

max_heap = [10, 8, 6, 4, 7, 3, 1]

values_to_add_in_max_heap = [9, 12, 5]

def get_parent_index(heap: List[int], current_index: int):
    return (current_index - 1) // 2

def insert_into_heap(heap: List[int], value_to_insert: int):

    heap.append(value_to_insert)

    current_index = len(heap) - 1

    while current_index > 0:

        parent_index = get_parent_index(heap, current_index=current_index)

        value_at_parent_index = heap[parent_index]

        if value_at_parent_index < heap[current_index]:
            heap[parent_index], heap[current_index] = heap[current_index], heap[parent_index]

        current_index = parent_index

    return heap


def main():
    
    for value in values_to_add_in_max_heap:
        insert_into_heap(max_heap, value)

    print(max_heap)

main()
