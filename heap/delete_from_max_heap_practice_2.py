max_heap = [100, 70, 50, 40, 30, 20, 10]

def delete_root(heap: list[int]):
    
    max_heap[0] = heap.pop()

    current_index = 0

    while current_index < len(heap):

        largest_node_index = current_index
        
        left_child, right_child = 2 * current_index + 1, 2 * current_index + 2

        if left_child < len(heap) and heap[left_child] > heap[largest_node_index]:
            largest_node_index = left_child

        if right_child < len(heap) and heap[right_child] > heap[largest_node_index]:
            largest_node_index = right_child

        if largest_node_index == current_index:
            break

        heap[largest_node_index], heap[current_index] = heap[current_index], heap[largest_node_index]

        current_index = largest_node_index

def main():

    delete_root(heap=max_heap) 

    print(max_heap) 

main()