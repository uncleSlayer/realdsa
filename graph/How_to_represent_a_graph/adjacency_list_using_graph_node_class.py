n = 4

edge_list = [
    (1, 2),
    (1, 3),    
    (2, 4),
]

class GraphNode:
    def __init__(self, value) -> None:

        self.value = value
        self.neighbours = []

    def append_neighbour(self, neighbourNode):
        if self.neighbours.index(neighbourNode):
            pass
        self.neighbours.append(neighbourNode)

    def __eq__(self, value_to_check: object) -> bool:
        return isinstance(value_to_check, GraphNode) and value_to_check.value == self.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __repr__(self) -> str:
        return f"<GaraphNode value={self.value}>"


adjacency_list = [
    [0] * n for _ in range(n)
]

list_set = set()

for source, destination in edge_list:

    node = GraphNode(source)
    node.append_neighbour(node)

    if (

    ):
        pass

print('list set is: ', list_set)