from typing import TypedDict

from langgraph.graph import START, StateGraph


class DemoState(TypedDict):
    text: str


def node_a(state: DemoState) -> DemoState:
    return {"text": state["text"] + "A"}


def node_b(state: DemoState) -> DemoState:
    return {"text": state["text"] + "B"}


def build_graph():
    graph = StateGraph(DemoState)
    graph.add_node("node_a", node_a)
    graph.add_node("node_b", node_b)
    graph.add_edge(START, "node_a")
    graph.add_edge("node_a", "node_b")
    return graph.compile()


def run_demo():
    app = build_graph()
    return app.invoke({"text": ""})


if __name__ == "__main__":
    print(run_demo())
