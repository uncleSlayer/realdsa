import math

max_heap = [50, 38, 40, 10, 20, 35, 45]

insert_values = [45, 60]

def insert_into_max_heap(heap, insert_values):

    for insert_val in insert_values:

        heap.append(insert_val)

        current_index = len(heap) - 1

        while current_index > 0:

            parent_index = math.floor((current_index - 1) / 2)

            value_at_parent_index = heap[parent_index]

            if heap[parent_index] < heap[current_index]:
                
                heap[parent_index] = heap[current_index]
                heap[current_index] = value_at_parent_index
            
            else:
                pass

            current_index = parent_index

    return heap


        
print(insert_into_max_heap(max_heap, insert_values=insert_values))