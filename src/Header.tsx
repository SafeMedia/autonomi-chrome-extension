import logo from "/images/icon-256.png";

const Header = () => {
    return (
        <header className="w-full flex items-center justify-between border-b dark:border-white/10 border-[#D4D7DD] p-2">
            <div className="flex items-center">
                <img
                    src={logo}
                    alt="logo"
                    height={35}
                    width={35}
                    className="m-1"
                />
            </div>
        </header>
    );
};

export default Header;
