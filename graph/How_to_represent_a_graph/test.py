from collections import defaultdict

edge_list = [(1,2),(1,3),(2,4)]

adjacency_list = defaultdict(list)

def add_node_and_neighbour(node, neighbour, is_undirected):

    adjacency_list[node].append(neighbour)  

    if is_undirected:
        adjacency_list[neighbour].append(node)

def main(): 

    for node_one, node_two in edge_list:
        add_node_and_neighbour(node_one, node_two, True)

    print(adjacency_list)

main()