n2 = 3

edge_list_2 = [(0,1),(1,2),(2,0)]

def init_graph(num):

    return [
       [0] * num for _ in range(num) 
    ]

matrix = init_graph(n2)

def add_edge(node_one, node_two, is_directed=True):

    matrix[node_one][node_two] = 1

    if not is_directed:
        matrix[node_two][node_one] = 1

for node_one, node_two in edge_list_2:
    add_edge(node_one, node_two, False)

print(matrix)