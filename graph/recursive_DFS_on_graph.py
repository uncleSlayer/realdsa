from collections import defaultdict

edge_list = [
    (1, 2),
    (1, 3),    
    (2, 4),
]

adjacency_list = defaultdict(list)

seen_set = set()
source = 0

for source, destination in edge_list:
    adjacency_list[source].append(destination)

print('The adjacency list is: ', adjacency_list)

def dfs_recursive(node):
    for neighbor in adjacency_list[node]:
        if neighbor not in seen_set:
            seen_set.add(neighbor)
            dfs_recursive(neighbor)

dfs_recursive(1)