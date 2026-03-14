min_heap = [1, 3, 6, 4, 7, 10, 8]

values_to_insert = [2, 0, 5]

def get_parent_index(heap: list[int], current_index: int):

    return (current_index - 1) // 2

def insert_in_heap(heap: list[int], value: int):
    
    heap.append(value)

    current_index = len(heap) - 1 

    while current_index > 0:
        parent_index = get_parent_index(heap, current_index=current_index)
        value_at_parent_index = heap[parent_index]

        if value_at_parent_index > heap[current_index]:
            heap[parent_index], heap[current_index] = heap[current_index], heap[parent_index]
            
            current_index = parent_index

        else:
            break

def main():
    for value in values_to_insert:
        insert_in_heap(min_heap, value)

    print(min_heap)

main()