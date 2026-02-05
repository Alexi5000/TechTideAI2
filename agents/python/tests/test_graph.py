from techtide_agents.graph import run_demo


def test_graph_runs():
    result = run_demo()
    assert result["text"] == "AB"
