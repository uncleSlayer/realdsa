from collections import defaultdict

n2 = 3

edge_list_2 = [(0,1),(1,2),(2,0)]

# adj_list = defaultdict(list)

adj_list = {}

def add_edge(node_one, node_two, is_directed=True):

    if node_one in adj_list:
        adj_list[node_one].append(node_two) 

    else:
        adj_list[node_one] = [node_two]

    if not is_directed:
        
        if node_two in adj_list:
            adj_list[node_two].append(node_one)

        else:
            adj_list[node_two] = [node_one]


for node_one, node_two in edge_list_2:
    add_edge(node_one, node_two, False)

    

print(adj_list)