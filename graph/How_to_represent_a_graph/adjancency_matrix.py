n = 4

edge_list = [
    (1, 2),
    (1, 3),    
    (2, 4),
]

adjacency_matrix = [
    [0] * n for _ in range(n)
]

print(adjacency_matrix)

for source, destination in edge_list:
    adjacency_matrix[source - 1][destination - 1] = 1

print('The adjacency_matrix looks like: ', adjacency_matrix)