export const Users = () => {
  return (
    <div className="flex justify-between">
      <div className="flex">
        <div className="rounded-full flex justify-center h-12 w-12 text-black mt-3.5 bg-slate-200">
          <div className="flex justify-center flex-col h-full text-xl">
            {user.firstname[0].toUpperCase()}
          </div>
        </div>
        <div className="flex flex-col justify-center h-full mt-1 ml-3">
          {user.firstname} {user.lastname}
        </div>
      </div>
      <div className="flex flelx-col justify-center h-full">
        <Button label={"Send Money"} />
      </div>
    </div>
  );
};
