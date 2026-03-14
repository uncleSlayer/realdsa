min_heap = [1, 3, 2, 7, 6, 4, 5]

def delete_min(heap: list[int]):
    
    heap[0] = heap.pop()

    current_index = 0

    while current_index < len(heap):

        smallest_node_index = current_index

        left_child, right_child = 2 * current_index + 1, 2 * current_index + 2

        if left_child < len(heap) and heap[left_child] < heap[smallest_node_index]:
            smallest_node_index = left_child

        if right_child < len(heap) and heap[right_child] < heap[smallest_node_index]:
            smallest_node_index = right_child

        if smallest_node_index == current_index:
            break

        heap[smallest_node_index], heap[current_index] = heap[current_index], heap[smallest_node_index]

        current_index = smallest_node_index

def main(heap):

    delete_min(heap)

    print(heap)


main(min_heap)