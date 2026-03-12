from collections import defaultdict

# Assuming n will be given
n = 3

edge_list = [(0, 1), (1, 2), (2, 0)]

# Adjacency matrix from edge list
adjacency_matrix = [
    [0] * 3 for _ in range(n)
]

# This will not work for a case where undirected graph (we are assuming here that there is a source and destination but what if there is no direction given at all)
for source, destination in edge_list:
    print(source, destination)
    adjacency_matrix[source][destination] = 1


print("Adjacency matrix is: ", adjacency_matrix)

# Below is the code for such a case

n2 = 3

edge_list_2 = [(0,1),(1,2),(2,0)]

adjacency_matrix_2 = [
    [0] * n2 for _ in range(n2)
]

for node_one, node_two in edge_list_2:

    adjacency_matrix_2[node_one][node_two] = 1
    adjacency_matrix_2[node_two][node_one] = 1

print("Adjacency matrix 2 is: ", adjacency_matrix_2)

# But there can be another weird case where we will have multiple edges between the same two nodes.

n3 = 3

edge_list_3 = [(0, 1), (1, 2), (2, 0), (2, 0)]

adjacency_matrix_3 = [
    [0] * n3 for _ in range(n3)
]

for node_one, node_two in edge_list_3:
    adjacency_matrix_3[node_one][node_two] += 1
    adjacency_matrix_3[node_two][node_one] += 1


print("Adjacency matrix 3 is: ", adjacency_matrix_3)



# Adjacency matrix is:  [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
# Adjacency matrix 2 is:  [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
# Adjacency matrix 3 is:  [[0, 1, 2], [1, 0, 1], [2, 1, 0]]
#
#
#
print("=================================")


# Adjacency list

n = 3
edge_list_4 = [(0, 1), (1, 2), (2, 0), (2, 0)]

adjacency_list = defaultdict(list)

for node_one, node_two in edge_list_4:
    adjacency_list[node_one].append(node_two)
    
    # Uncomment the following if you want a undirected graph
    # adjacency_list[node_two].append(node_one)


print("The adjacency list list is: ", adjacency_list)


# adjacency list using GraphNode
class GraphNode:

    def __init__(self, value) -> None:
        
        self.value = value

        self.neighbours = []

    def add_neighbour(self, value):
        self.neighbours.append(value)


    def __repr__(self) -> str:
        return f"<GraphNode value={self.value}>"


n = 3

adjacency_set = []

edge_list_5 = [(0, 1), (1, 2), (2, 0), (2, 0)]

# for node_one, node_two in edge_list_5:

