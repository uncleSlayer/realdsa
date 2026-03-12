question_heap = [50, 38, 40, 10, 20, 35]

new_val = 45

def insert(heap, new_value):
    
    heap.append(new_value)

    current_index = len(heap) - 1

    while (current_index > 0):

        parent_index = (current_index - 1) // 2

        if (heap[parent_index] < heap[current_index]):

            temp = heap[parent_index]

            heap[parent_index] = new_value
            heap[current_index] = temp

        current_index = parent_index

    print(f"Add the {new_value} to the heap")

insert(question_heap, new_val)

print(question_heap)