import math

"""
Heap - complete binary tree which satisfies heap properties.
Complete binary tree - a binary tree where all levels are fully filled, except possibly the last level, which is filled from left to right

For a complete binary tree (1 index based)
if Node is i,
    Parent node is: math.floor(i/2)
    Left child of i: 2 * i
    Right child of i: 2 * i + 1

For a complete binary tree (0 index based)
if Node is i,
    Parent node is: math.floor((i-1)/2)
    Left child of i: 2i + 1
    Right child of i: 2i + 2
"""

question_heap = [50, 38, 40, 10, 20, 35]

new_val = 45

def insert_in_max_heap(heap, new_value):
    
    question_heap.append(new_value)

    current_index = len(question_heap) - 1

    while current_index > 0:

        parent_index = (current_index - 1) // 2

        value_at_parent_index = question_heap[parent_index]

        if new_value > value_at_parent_index:

            heap[parent_index] = new_value
            heap[current_index] = value_at_parent_index
        
        """
            assigning current_index to parent index helps us comparing the new parent index with the current index.
            but we also don't keep it inside the if statement in order to let it go out of while loop.
        """

        current_index = parent_index

    return heap


print(insert_in_max_heap(question_heap, new_value=new_val))