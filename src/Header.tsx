import headerLogo from "/images/header-dark.png";

const Header = () => {
    return (
        <header className="w-full flex items-center justify-center border-b dark:border-white/10 border-[#D4D7DD] p-2">
            <img
                src={headerLogo}
                alt="header-logo"
                height={70}
                className="m-1 py-2 px-4"
            />
        </header>
    );
};

export default Header;
