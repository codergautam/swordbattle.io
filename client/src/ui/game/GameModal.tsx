import evolutions from "../../utils/evolution";
import "./GameModal.scss";

function Modal({ game, payload }: any) {
  const setEvolution = (name: string) => {
    game.scene.scenes[0].events.emit("evolve", name);
    game.events.emit("closeModal");
  };

  return (
    <div className="game-modal">
      {payload?.evolutions?.map((name: string) => {
        const res = evolutions.find((evolution) => evolution.name === name) || {
          name: "unknown",
          skin: "",
        };

        return (
          <div
            key={res.name}
            className="evolution"
            onClick={() => setEvolution(res.name)}
          >
            <img src={res.skin} alt={res.name} />
            <div>{name}</div>
          </div>
        );
      })}
    </div>
  );
}

export default Modal;
